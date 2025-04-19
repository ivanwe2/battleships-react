import { configureStore } from "@reduxjs/toolkit";
import { playerReducer } from "./slice/playersSlice";

export const store = configureStore({
    reducer: {
        playerStore: playerReducer,
    },
});