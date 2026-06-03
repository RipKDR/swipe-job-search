import { useState } from 'react';
import { View, TextInput, Text } from '@/components/tw';
import { Button } from '@/components/ui/Button';
import { contentMaxWidthChat, screenPadding } from '@/lib/responsive-layout';

type MessageInputProps = {
  disabled?: boolean;
  loading?: boolean;
  onSend: (body: string) => Promise<void>;
};

export function MessageInput({ disabled, loading, onSend }: MessageInputProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || disabled || loading) return;

    setError(null);
    try {
      await onSend(body);
      setText('');
    } catch (sendError: any) {
      setError(sendError?.message ?? 'Unable to send message');
    }
  };

  return (
    <View className={`w-full items-center ${screenPadding} border-t border-slate-800/80 bg-slate-950/95 py-3`}>
      <View className={`w-full ${contentMaxWidthChat} gap-2`}>
        {error ? <Text className="text-rose-300 text-sm">{error}</Text> : null}
        <View className="flex-row items-end gap-2">
          <TextInput
            value={text}
            onChangeText={setText}
            editable={!disabled && !loading}
            placeholder={disabled ? 'Messaging closed' : 'Type a message…'}
            placeholderTextColor="#64748b"
            multiline
            className="flex-1 min-h-[44px] max-h-32 rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-white text-[15px] sm:text-base"
          />
          <Button
            title="Send"
            disabled={disabled || loading || !text.trim()}
            loading={loading}
            onPress={handleSend}
          />
        </View>
      </View>
    </View>
  );
}
