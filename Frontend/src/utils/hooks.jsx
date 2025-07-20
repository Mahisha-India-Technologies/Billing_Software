import { useEffect, useState, useCallback } from "react";
import { fetchReminderData } from "./reminder";

const useReminderData = () => {
  const [reminders, setReminders] = useState([]);
  const [overdues, setOverdues] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const { reminders, overdues } = await fetchReminderData();
      setReminders(reminders);
      setOverdues(overdues);
    } catch (err) {
      console.error("🔴 Failed to fetch reminder data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh(); // Initial load
  }, [refresh]);

  const totalCount = reminders.length + overdues.length;

  return {
    reminders,
    overdues,
    totalCount,
    loading,
    refresh,
  };
};

export default useReminderData;
