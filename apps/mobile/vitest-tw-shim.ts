import { createElement, type ComponentProps } from 'react';
import { View } from 'react-native';

export {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Image,
  TouchableHighlight,
} from 'react-native';

type ViewProps = ComponentProps<typeof View>;

export const Link = (props: ViewProps) => createElement(View, props);
export const LinkTrigger = (props: ViewProps) => createElement(View, props);
export const LinkMenu = (props: ViewProps) => createElement(View, props);
export const LinkMenuAction = (props: ViewProps) => createElement(View, props);
export const LinkPreview = (props: ViewProps) => createElement(View, props);

export const useCSSVariable = (variable: string) => variable;
