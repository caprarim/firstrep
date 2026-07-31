import { Tabs } from 'expo-router';
import { Dumbbell, GraduationCap, PersonStanding } from 'lucide-react-native';
import * as React from 'react';
import { Icon } from '~/components/ui/icon';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#F97316',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#121519',
          borderTopColor: '#22262C',
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Exercises',
          tabBarIcon: ({ color, size }) => <Icon as={Dumbbell} size={size} color={color} />,
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
