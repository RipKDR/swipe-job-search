// @ts-ignore - React may not be available in test environment
import type { ComponentProps } from 'react';

// Minimal React Native shims for non-RN environments (e.g., Vitest in Node)
export const View = 'View';
export const Text = 'Text';
export const Pressable = 'Pressable';
export const ScrollView = 'ScrollView';
export const TextInput = 'TextInput';
export const Image = 'Image';
export const TouchableHighlight = 'TouchableHighlight';

// Use React.createElement if available at runtime, otherwise fall back to a simple factory.
const createElement =
   
  (globalThis as any).React?.createElement ??
  ((type: any, props: any) => ({ type, props }));

type ViewProps = ComponentProps<'View'>;

export const Link = (props: ViewProps) => createElement(View, props);
export const LinkTrigger = (props: ViewProps) => createElement(View, props);
export const LinkMenu = (props: ViewProps) => createElement(View, props);
export const LinkMenuAction = (props: ViewProps) => createElement(View, props);
export const LinkPreview = (props: ViewProps) => createElement(View, props);

export const useCSSVariable = (variable: string) => variable;
