import { useLocalSearchParams } from 'expo-router';

import { ArtistDetail } from '@/views/ArtistDetail/ArtistDetail';

export default function ArtistDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ArtistDetail artistId={id ?? ''} />;
}
