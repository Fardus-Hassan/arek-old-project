import { configureStore } from "@reduxjs/toolkit";
import adminReducer from "./features/adminSlice";
import { authApi } from "./api/authApi";
import { userApi } from "./api/userApi";
import { adminApi } from "./api/adminApi";
import { documentApi } from "./api/documentApi";
import { fileSaveApi } from "./api/fileSaveApi";
import { featureApi } from "./api/featureApi";
import { timeZoneApi } from "./api/timeZoneApi";
import { modelPositionApi } from "./api/modelPositionApi";
import { shopifyApi } from "./api/shopifyApi";

export const makeStore = () => {
  return configureStore({
    reducer: {
      admin: adminReducer,
      [authApi.reducerPath]: authApi.reducer,
      [userApi.reducerPath]: userApi.reducer,
      [adminApi.reducerPath]: adminApi.reducer,
      [documentApi.reducerPath]: documentApi.reducer,
      [fileSaveApi.reducerPath]: fileSaveApi.reducer,
      [featureApi.reducerPath]: featureApi.reducer,
      [timeZoneApi.reducerPath]: timeZoneApi.reducer,
      [modelPositionApi.reducerPath]: modelPositionApi.reducer,
      [shopifyApi.reducerPath]: shopifyApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(
        authApi.middleware,
        userApi.middleware,
        adminApi.middleware,
        documentApi.middleware,
        fileSaveApi.middleware,
        featureApi.middleware,
        timeZoneApi.middleware,
        modelPositionApi.middleware,
        shopifyApi.middleware,
      ),
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
