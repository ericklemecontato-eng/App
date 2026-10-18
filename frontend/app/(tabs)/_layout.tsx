import { Tabs } from "expo-router";
import { House, Buildings, Key, DotsThreeOutline } from "phosphor-react-native";
import { Platform } from "react-native";

import { useTheme } from "@/src/theme";

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size }) => <House color={color} size={size} weight="fill" />,
        }}
      />
      <Tabs.Screen
        name="andares"
        options={{
          title: "Andares",
          tabBarIcon: ({ color, size }) => <Buildings color={color} size={size} weight="fill" />,
        }}
      />
      <Tabs.Screen
        name="chaves"
        options={{
          title: "Chaves",
          tabBarIcon: ({ color, size }) => <Key color={color} size={size} weight="fill" />,
        }}
      />
      <Tabs.Screen
        name="mais"
        options={{
          title: "Mais",
          tabBarIcon: ({ color, size }) => <DotsThreeOutline color={color} size={size} weight="fill" />,
        }}
      />
    </Tabs>
  );
}
