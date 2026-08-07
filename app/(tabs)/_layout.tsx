import { Tabs } from 'expo-router';
import { CalendarDays, Dumbbell, GraduationCap, PersonStanding, Target } from 'lucide-react-native';
import * as React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '~/components/ui/icon';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#F97316',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#121519',
          borderTopColor: '#22262C',
          height: 62 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Exercises',
          tabBarIcon: ({ color, size }) => <Icon as={Dumbbell} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="splits"
        options={{
          title: 'Splits',
          tabBarIcon: ({ color, size }) => <Icon as={CalendarDays} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'My Plan',
          tabBarIcon: ({ color, size }) => <Icon as={Target} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="muscles"
        options={{
          title: 'Muscles',
          tabBarIcon: ({ color, size }) => <Icon as={PersonStanding} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="basics"
        options={{
          title: 'Basics',
          tabBarIcon: ({ color, size }) => <Icon as={GraduationCap} size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
