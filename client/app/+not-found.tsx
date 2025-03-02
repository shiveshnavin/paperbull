import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Title } from 'react-native-boxes';


export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <Title>
        Page not found
      </Title>
      <Link href="/watchlist" style={styles.link}>
        Go back home
      </Link>
    </>
  );
}

const styles = StyleSheet.create({
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
