import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Inactive";
}

interface AdminState {
  admins: Admin[];
}

const initialState: AdminState = {
  admins: [
    {
      id: "1",
      name: "Lebron James",
      email: "leborn james03@gmail.com",
      role: "Admin",
      status: "Active",
    },
    {
      id: "2",
      name: "Lebron James",
      email: "leborn james03@gmail.com",
      role: "Admin",
      status: "Active",
    },
    {
      id: "3",
      name: "Lebron James",
      email: "leborn james03@gmail.com",
      role: "Admin",
      status: "Active",
    },
    {
      id: "4",
      name: "Lebron James",
      email: "leborn james03@gmail.com",
      role: "Admin",
      status: "Active",
    },
  ],
};

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    addAdmin: (state, action: PayloadAction<Admin>) => {
      state.admins.push(action.payload);
    },
    removeAdmin: (state, action: PayloadAction<string>) => {
      state.admins = state.admins.filter(
        (admin) => admin.id !== action.payload,
      );
    },
  },
});

export const { addAdmin, removeAdmin } = adminSlice.actions;
export default adminSlice.reducer;
