import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SupplementsScreen from '../screens/SupplementsScreen';
import AddSupplementScreen from '../screens/AddSupplementScreen';
import RecommendationScreen from '../screens/RecommendationScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { token, loading, profileComplete } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          // Unauthenticated
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : !profileComplete ? (
          // Authenticated but hasn't completed onboarding
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          // Fully set up
          <>
            <Stack.Screen name="Supplements" component={SupplementsScreen} />
            <Stack.Screen
              name="Onboarding"
              component={OnboardingScreen}
              options={{
                headerShown: true,
                headerTitle: '',
                headerStyle: { backgroundColor: '#0B0C10' },
                headerTintColor: '#5eead4',
              }}
            />
            <Stack.Screen
              name="AddSupplement"
              component={AddSupplementScreen}
              options={{
                headerShown: true,
                headerTitle: '',
                headerStyle: { backgroundColor: '#0B0C10' },
                headerTintColor: '#5eead4',
              }}
            />
            <Stack.Screen
              name="Recommendation"
              component={RecommendationScreen}
              options={{
                headerShown: true,
                headerTitle: 'AI Coach',
                headerStyle: { backgroundColor: '#0B0C10' },
                headerTintColor: '#5eead4',
                headerTitleStyle: { color: '#fff' },
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
