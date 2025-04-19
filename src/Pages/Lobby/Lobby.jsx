import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setPlayers,
  registerPlayer,
  logoutPlayer,
} from "../../redux/slice/playersSlice";
import { useNavigate } from "react-router-dom";
import "./Lobby.css";

function Lobby() {
  const [username, setUsername] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [invite, setInvite] = useState(null);
  const players = useSelector((state) => state.playerStore.players);
  const dispatch = useDispatch();
  const socketRef = useRef(null);
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    if (isLoggedIn) {
      socketRef.current?.send(JSON.stringify({ type: "LOGOUT", username }));
      dispatch(logoutPlayer(username));
    }
  }, [isLoggedIn, username, dispatch]);

  useEffect(() => {
    if (!isLoggedIn) return;

    window.addEventListener("beforeunload", handleLogout);
    return () => {
      window.removeEventListener("beforeunload", handleLogout);
      socketRef.current?.close();
    };
  }, [handleLogout, isLoggedIn]);

  const handleRegister = (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    const wsUrl = process.env.REACT_APP_WS_SERVER_URL;
    socketRef.current = new WebSocket(wsUrl);

    socketRef.current.onopen = () => {
      socketRef.current.send(JSON.stringify({ type: "REGISTER", username }));
      dispatch(registerPlayer(username));
      setIsLoggedIn(true);
    };

    socketRef.current.onmessage = handleSocketMessage;
    socketRef.current.onerror = (err) => console.error("WebSocket error:", err);
    socketRef.current.onclose = () => console.log("WebSocket closed");
  };

  const handleSocketMessage = (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case "SET_PLAYERS":
        dispatch(setPlayers(data.players));
        break;
      case "INVITE":
        setInvite(data.from);
        break;
      case "START_GAME":
        navigate("/game", {
          state: { player: username, opponent: data.opponent },
        });
        break;
      default:
        break;
    }
  };

  const handleInvite = (event, player) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({ type: "INVITE", from: username, to: player })
      );
    }

    const inviteBtn = event.target;
    inviteBtn.textContent = "Sent!";
    inviteBtn.disabled = true;
    inviteBtn.classList.add("invite-sent");
  };

  const handleAcceptInvite = () => {
    socketRef.current.send(
      JSON.stringify({ type: "ACCEPT_INVITE", from: invite, to: username })
    );
    navigate("/game", {
      state: { player: username, opponent: invite, gameId: `${invite}-${username}` },
    });
  };

  const handleDeclineInvite = () => setInvite(null);

  const renderRegisterSection = () => (
    <div className="lobby-panel">
      <h2>
      {isLoggedIn ? (
        <>
          Prepare for <span className="battle-text">battle</span>, {username}!
        </>
      ) : (
        "Register"
      )}
      </h2>
      {!isLoggedIn && (
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
      )}
    </div>
  );

  const renderPlayersList = () => (
    <div className="lobby-panel">
      <h2>Online Players</h2>
      {isLoggedIn ? (
        <ul>
          <li key="you" className="player-self">You</li>
          {players.filter((player) => player !== username).map((player, i) => (
            <li key={i}>
              {player}
              {player !== username && (
                <button className="invite-btn" onClick={(e) => handleInvite(e, player)}>
                  Invite
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>Register to see online users!</p>
      )}
    </div>
  );

  const renderInvitePopup = () =>
    invite && (
      <div className="invite-modal">
        <div className="invite-content">
          <p><strong>{invite}</strong> invited you to play!</p>
          <div className="invite-actions">
            <button onClick={handleAcceptInvite}>Accept</button>
            <button onClick={handleDeclineInvite} className="secondary">Decline</button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="lobby">
      <header className="lobby-header">
        <h1>Battleships Lobby</h1>
      </header>
      <main className="lobby-main">
        {renderRegisterSection()}
        {renderPlayersList()}
      </main>
      {renderInvitePopup()}
    </div>
  );
}

export default Lobby;