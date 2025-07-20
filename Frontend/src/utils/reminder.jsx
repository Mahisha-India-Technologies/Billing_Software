// utils/fetchReminderData.js
import axios from "axios";
import API_BASE_URL from "../Context/Api";

export const fetchReminderData = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/send/check-reminder-status`);
  const { reminders = [], overdues = [] } = res.data;
  return { reminders, overdues };
};
