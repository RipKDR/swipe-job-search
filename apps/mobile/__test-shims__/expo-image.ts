import { createElement } from 'react';
export const Image = (props: any) =>
  createElement('img', { src: props.source, alt: props.accessibilityLabel ?? '' });
export const ImageBackground = ({ children, ...props }: any) =>
  createElement('div', props, children);
