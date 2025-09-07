import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image } from 'react-native';

import HomeScreen from '../components/HomeScreen';
import CalendarScreen from '../components/CalendarScreen';
import LibraryScreen from '../components/LibraryScreen';
import MyPageScreen from '../components/MyPageScreen';

type TabParamList = {
  Home: undefined;
  Calendar: undefined;
  Library: undefined;
  MyPage: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export default function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#222',
        tabBarInactiveTintColor: '#ccc',
        tabBarStyle: {
          height: 84,
          paddingTop: 6,
          paddingBottom: 12,
        },
        tabBarIcon: ({ focused }) => {
          let iconSource;

          if (route.name === 'Home') {
            iconSource = focused
              ? require('../assets/icons/home_active.png')
              : require('../assets/icons/home.png');
          } else if (route.name === 'Calendar') {
            iconSource = focused
              ? require('../assets/icons/calendar_active.png')
              : require('../assets/icons/calendar.png');
          } else if (route.name === 'Library') {
            iconSource = focused
              ? require('../assets/icons/library_active.png')
              : require('../assets/icons/library.png');
          } else if (route.name === 'MyPage') {
            iconSource = focused
              ? require('../assets/icons/mypage_active.png')
              : require('../assets/icons/mypage.png');
          }

          return (
            <Image
              source={iconSource}
              style={{ width: 24, height: 24 }}
              resizeMode="contain"
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'HOME' }} />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ tabBarLabel: 'CALENDAR' }} />
      <Tab.Screen name="Library" component={LibraryScreen} options={{ tabBarLabel: 'LIBRARY' }} />
      <Tab.Screen name="MyPage" component={MyPageScreen} options={{ tabBarLabel: 'MY PAGE' }} />
    </Tab.Navigator>
  );
}
