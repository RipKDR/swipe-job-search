import { useCssElement } from "react-native-css";
import React from "react";
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { Image as RNImage } from "expo-image";

const AnimatedExpoImage = Animated.createAnimatedComponent(RNImage);

type CSSImageProps = React.ComponentProps<typeof AnimatedExpoImage>;
type ContentFit = CSSImageProps["contentFit"];
type ContentPosition = CSSImageProps["contentPosition"];
type StyleWithObjectProps = {
  objectFit?: ContentFit;
  objectPosition?: ContentPosition;
  [key: string]: unknown;
};

const CSSImage = React.forwardRef<
  React.ElementRef<typeof AnimatedExpoImage>,
  CSSImageProps
>(function CSSImage(props, ref) {
  let contentFit: ContentFit;
  let contentPosition: ContentPosition;
  let flattenedStyle: CSSImageProps["style"];

  if (props.style) {
    const styleObject = StyleSheet.flatten(props.style);

    if (styleObject && typeof styleObject === "object" && !Array.isArray(styleObject)) {
      const typedStyleObject = styleObject as StyleWithObjectProps;
      contentFit = typedStyleObject.objectFit;
      contentPosition = typedStyleObject.objectPosition;
      const {
        objectFit: _objFit,
        objectPosition: _objPos,
        ...restStyle
      } = typedStyleObject;
      flattenedStyle = restStyle as CSSImageProps["style"];
    } else {
      flattenedStyle = undefined;
    }
  } else {
    flattenedStyle = undefined;
  }

  return (
    <AnimatedExpoImage
      ref={ref}
      contentFit={contentFit}
      contentPosition={contentPosition}
      {...props}
      source={
        typeof props.source === "string"
          ? { uri: props.source }
          : props.source
      }
      style={flattenedStyle}
    />
  );
});
CSSImage.displayName = "CSS(CSSImage)";

type ImageProps = CSSImageProps & { className?: string };

export const Image = React.forwardRef<
  React.ElementRef<typeof CSSImage>,
  ImageProps
>(function Image(props, ref) {
  return useCssElement(
    CSSImage as React.ComponentType<any>,
    { ...props, ref } as any,
    { className: "style" }
  );
});
Image.displayName = "CSS(Image)";
