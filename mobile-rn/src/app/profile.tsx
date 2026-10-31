import { View } from 'react-native';

import { TopBar } from '@/components/common/TopBar/TopBar';
import { Profile } from '@/views/Profile/Profile';

export default function ProfileRoute() {
  return (
    <View style={{ flex: 1 }}>
      <TopBar title="Profil" />
      <Profile />
    </View>
  );
}
