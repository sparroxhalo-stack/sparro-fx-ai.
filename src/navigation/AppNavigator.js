import React, { useEffect, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';
import { Ionicons }                 from '@expo/vector-icons';
import { colors, fonts }            from '../theme';
import { useAuth }                  from '../services/AuthContext';
import {
  registerForPushNotifications,
  addNotificationListener,
  addNotificationResponseListener,
} from '../services/notifications';

import LoginScreen       from '../screens/LoginScreen';
import PulseScreen       from '../screens/PulseScreen';
import ScannerScreen     from '../screens/ScannerScreen';
import TradeOfDayScreen  from '../screens/TradeOfDayScreen';
import AlertsScreen      from '../screens/AlertsScreen';
import BotScreen         from '../screens/BotScreen';
import JournalScreen     from '../screens/JournalScreen';
import PerformanceScreen from '../screens/PerformanceScreen';
import SettingsScreen    from '../screens/SettingsScreen';
import PropFirmScreen    from '../screens/PropFirmScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

const ICON_MAP = {
  Pulse:       ['flash',         'flash-outline'],
  Scanner:     ['bar-chart',     'bar-chart-outline'],
  Trade:       ['trophy',        'trophy-outline'],
  Alerts:      ['notifications', 'notifications-outline'],
  Bot:         ['hardware-chip', 'hardware-chip-outline'],
  Journal:     ['journal',       'journal-outline'],
  Performance: ['stats-chart',   'stats-chart-outline'],
  PropFirms:   ['business',      'business-outline'],
  Settings:    ['settings',      'settings-outline'],
};

function MainTabs() {
  const { isPremium } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          const [active, inactive] = ICON_MAP[route.name] || ['ellipse','ellipse-outline'];
          return <Ionicons name={focused ? active : inactive} size={22} color={color} />;
        },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor:  colors.border,
          borderTopWidth:  1,
          height:          70,
          paddingBottom:   12,
          paddingTop:      8,
        },
        tabBarLabelStyle: { fontSize: fonts.xs, fontWeight: '600' },
        headerStyle: {
          backgroundColor:  colors.bg,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
        },
        headerTintColor:     colors.text,
        headerTitleStyle:    { fontWeight: '800', fontSize: fonts.lg },
      })}
    >
      {/* Free + Premium */}
      <Tab.Screen
        name="Pulse"
        component={PulseScreen}
        options={{ headerTitle: '⚡ Sparro FX AI', tabBarLabel: 'Pulse' }}
      />
      <Tab.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{ headerTitle: '📊 Scanner', tabBarLabel: 'Scanner' }}
      />

      {/* Premium only */}
      {isPremium && (
        <Tab.Screen
          name="Trade"
          component={TradeOfDayScreen}
          options={{ headerTitle: '🏆 Trade of Day', tabBarLabel: 'Best Trade' }}
        />
      )}

      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{ headerTitle: '🔔 Alerts', tabBarLabel: 'Alerts' }}
      />

      {isPremium && (
        <Tab.Screen
          name="Bot"
          component={BotScreen}
          options={{ headerTitle: '🤖 MT5 Bot', tabBarLabel: 'MT5 Bot' }}
        />
      )}

      {isPremium && (
        <Tab.Screen
          name="Journal"
          component={JournalScreen}
          options={{ headerTitle: '📓 Journal', tabBarLabel: 'Journal' }}
        />
      )}

      {isPremium && (
        <Tab.Screen
          name="Performance"
          component={PerformanceScreen}
          options={{ headerTitle: '📈 Performance', tabBarLabel: 'Stats' }}
        />
      )}

      <Tab.Screen
        name="PropFirms"
        component={PropFirmScreen}
        options={{ headerTitle: '🏦 Prop Firms', tabBarLabel: 'Prop Firms' }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerTitle: '⚙️ Settings', tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const notifListener    = useRef();
  const responseListener = useRef();

  useEffect(() => {
    if (user) {
      registerForPushNotifications();
      notifListener.current    = addNotificationListener(n => console.log('Notif:', n));
      responseListener.current = addNotificationResponseListener(r => console.log('Tapped:', r));
    }
    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user]);

  if (loading) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user
        ? <Stack.Screen name="Main"  component={MainTabs} />
        : <Stack.Screen name="Login" component={LoginScreen} />
      }
    </Stack.Navigator>
  );
}
