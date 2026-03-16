import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getLocalRules,
  loadWatchRules,
  saveWatchRule,
  removeWatchRule,
  getLocalAlerts,
  loadStoryAlerts,
  saveAlert,
  markAlertRead,
  markAllAlertsRead,
} from '@/services/watchRules';
import type { WatchRule, StoryAlert } from '@/types/watchRule';

export function useWatchRules(isPaid = false) {
  const { user } = useAuth();
  const [rules, setRules]   = useState<WatchRule[]>(() => user ? getLocalRules(user.uid) : []);
  const [alerts, setAlerts] = useState<StoryAlert[]>(() => user ? getLocalAlerts(user.uid) : []);

  useEffect(() => {
    if (!user) { setRules([]); setAlerts([]); return; }
    loadWatchRules(user.uid).then(setRules);
    loadStoryAlerts(user.uid).then(setAlerts);
  }, [user]);

  const addRule = useCallback(async (rule: WatchRule): Promise<{ success: boolean; limitReached: boolean }> => {
    if (!user) return { success: false, limitReached: false };
    if (!isPaid && rules.length >= 3) return { success: false, limitReached: true };
    setRules(prev => [...prev.filter(r => r.id !== rule.id), rule]);
    await saveWatchRule(user.uid, rule);
    return { success: true, limitReached: false };
  }, [user, isPaid, rules]);

  const toggleRule = useCallback(async (ruleId: string) => {
    if (!user) return;
    setRules(prev => {
      const updated = prev.map(r => r.id === ruleId ? { ...r, active: !r.active } : r);
      const changed = updated.find(r => r.id === ruleId);
      if (changed) saveWatchRule(user.uid, changed);
      return updated;
    });
  }, [user]);

  const deleteRule = useCallback(async (ruleId: string) => {
    if (!user) return;
    setRules(prev => prev.filter(r => r.id !== ruleId));
    await removeWatchRule(user.uid, ruleId);
  }, [user]);

  const addAlert = useCallback(async (alert: StoryAlert) => {
    if (!user) return;
    setAlerts(prev => [alert, ...prev.filter(a => a.id !== alert.id)].slice(0, 100));
    await saveAlert(user.uid, alert);
  }, [user]);

  const readAlert = useCallback(async (alertId: string) => {
    if (!user) return;
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, read: true } : a));
    await markAlertRead(user.uid, alertId);
  }, [user]);

  const readAllAlerts = useCallback(async () => {
    if (!user) return;
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    await markAllAlertsRead(user.uid);
  }, [user]);

  const unreadCount = alerts.filter(a => !a.read).length;

  return { rules, alerts, unreadCount, addRule, toggleRule, deleteRule, addAlert, readAlert, readAllAlerts };
}
