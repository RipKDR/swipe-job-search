import React from 'react';
import { View, Text, Pressable } from '@/components/tw';

type Props = { children: React.ReactNode; fallback?: React.ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-white text-lg mb-2">Something went wrong</Text>
          <Text className="text-slate-400 text-sm mb-4">{this.state.error?.message}</Text>
          <Pressable onPress={() => this.setState({ hasError: false, error: null })} className="bg-indigo-600 px-4 py-2 rounded-lg">
            <Text className="text-white font-medium">Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
