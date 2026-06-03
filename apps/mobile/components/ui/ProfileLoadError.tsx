import { AppScreen } from './AppScreen';
import { EmptyState } from './EmptyState';
import { Button } from './Button';

type ProfileLoadErrorProps = {
  onRetry: () => void;
  loading?: boolean;
};

export function ProfileLoadError({ onRetry, loading = false }: ProfileLoadErrorProps) {
  return (
    <AppScreen centered maxWidth="md">
      <EmptyState
        emoji="⚠️"
        title="Could not load your profile"
        description="Check your connection and try again."
        secondary={<Button title="Retry" onPress={onRetry} loading={loading} fullWidth />}
      />
    </AppScreen>
  );
}
