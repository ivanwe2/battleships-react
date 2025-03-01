import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setPlayers,
  registerPlayer,
  logoutPlayer,
} from "../redux/slice/playersSlice";
import "../Assets/Styles/Lobby.css";
import { useNavigate } from "react-router-dom";

function Lobby() {
  const [username, setUsername] = useState("");
  //const [userId, setUserId] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [invite, setInvite] = useState(null);
  const players = useSelector((state) => state.playerStore.players);
  const dispatch = useDispatch();
  const socketRef = useRef(null);
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    if (isLoggedIn) {
      socketRef.current.send(JSON.stringify({ type: "LOGOUT", username }));
      dispatch(logoutPlayer(username));
    }
  }, [isLoggedIn, username, dispatch]);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    window.addEventListener("beforeunload", handleLogout);

    return () => {
      window.removeEventListener("beforeunload", handleLogout);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [handleLogout, isLoggedIn]);

  const handleRegister = (e) => {
    e.preventDefault();
    if (username.trim()) {
      const wsUrl = process.env.REACT_APP_WS_SERVER_URL;
      console.log(`Connecting to WebSocket server at ${wsUrl}`);
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        socketRef.current.send(JSON.stringify({ type: "REGISTER", username }));
        dispatch(registerPlayer(username));
        setIsLoggedIn(true);
      };

      socketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "SET_PLAYERS") {
          dispatch(setPlayers(data.players));
        } else if (data.type === "INVITE") {
          setInvite(data.from);
        } else if (data.type === "START_GAME") {
          navigate("/game", { state: { player: username, opponent: data.opponent } });
        }
      };

      socketRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      socketRef.current.onclose = () => {
        console.log("WebSocket connection closed");
      };
    }
  };

  const handleInvite = (player) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log(`Sending invite from ${username} to ${player}`);
      socketRef.current.send(
        JSON.stringify({ type: "INVITE", from: username, to: player })
      );
    } else {
      console.error("WebSocket connection is not open");
    }
  };

  const handleAcceptInvite = () => {
    socketRef.current.send(
      JSON.stringify({ type: 'ACCEPT_INVITE', from: invite, to: username })
    );
    navigate("/game", { state: { player: username, opponent: invite, gameId: `${invite}-${username}` } });
  };

  const handleDeclineInvite = () => {
    setInvite(null);
  };

  return (
    <div className="Lobby">
      <div className="Lobby-left">
        <h2>Register</h2>
        {!isLoggedIn ? (
          <form onSubmit={handleRegister}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
            <button type="submit">Register</button>
          </form>
        ) : (
          <p>Welcome, {username}!</p>
        )}
      </div>
      <div className="Lobby-right">
        {isLoggedIn ? (
          <>
            <h2>Online Players</h2>
            <ul>
              {players.map((player, index) => (
                <li key={index}>
                  {player}{" "}
                  {player !== username && (
                    <button className="invite-btn" onClick={() => handleInvite(player)}>Invite</button>
                  )}
                </li>
              ))}
            </ul>
          </>) :
           <p>Register to see online users!</p>}
      </div>
        
      <div className="Lobby-invite">
        {invite && (
          <div className="invite-popup">
            <p>{invite} has invited you to a game!</p>
            <button onClick={handleAcceptInvite}>Accept</button>
            <button onClick={handleDeclineInvite}>Decline</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Lobby;