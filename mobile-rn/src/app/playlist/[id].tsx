import { useLocalSearchParams } from 'expo-router';

import { PlaylistDetail } from '@/views/Playlist/PlaylistDetail';

export default function PlaylistRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlaylistDetail id={id ?? ''} />;
}
