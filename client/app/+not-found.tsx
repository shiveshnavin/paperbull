import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Center, TextView, Title } from 'react-native-boxes';


export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <Center>
        <Title>
          Page not found
        </Title>
        <Link href="/home" style={styles.link}>
          <TextView>
            Go back home
          </TextView>
        </Link>
      </Center>
    </>
  );
}

const styles = StyleSheet.create({
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
