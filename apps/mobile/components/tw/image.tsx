import { useCssElement } from "react-native-css";
import React from "react";
import {
  Image as RNImage,
  Platform,
  StyleSheet,
} from "react-native";
import Animated from "react-native-reanimated";
import { Image as ExpoImage } from "expo-image";

type RNImageProps = React.ComponentProps<typeof RNImage>;

const AnimatedExpoImage =
  Platform.OS === "web" ? null : Animated.createAnimatedComponent(ExpoImage);

type ExpoImageProps = React.ComponentProps<typeof ExpoImage>;
type ContentFit = ExpoImageProps["contentFit"];
type ContentPosition = ExpoImageProps["contentPosition"];
type CSSImageProps = Omit<ExpoImageProps, "source" | "style"> &
  Omit<RNImageProps, "source" | "style"> & {
    source?: ExpoImageProps["source"] | RNImageProps["source"] | string;
    style?: ExpoImageProps["style"] | RNImageProps["style"];
  };
type StyleWithObjectProps = {
  objectFit?: ContentFit;
  objectPosition?: ContentPosition;
  [key: string]: unknown;
};

const CSSImage = React.forwardRef<any, CSSImageProps>(function CSSImage(props, ref) {
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

  const normalizedSource =
    typeof props.source === "string" ? { uri: props.source } : props.source;
  const imageContentFit = contentFit ?? props.contentFit;
  const imageContentPosition = contentPosition ?? props.contentPosition;

  if (Platform.OS === "web") {
    const {
      contentFit: _contentFit,
      contentPosition: _contentPosition,
      ...webProps
    } = props;
    const resizeMode =
      imageContentFit === "contain" || imageContentFit === "scale-down"
        ? "contain"
        : imageContentFit === "fill"
          ? "stretch"
          : imageContentFit === "none"
            ? "center"
            : "cover";

    return (
      <RNImage
        ref={ref}
        {...(webProps as RNImageProps)}
        source={normalizedSource as RNImageProps["source"]}
        resizeMode={resizeMode}
        style={flattenedStyle as RNImageProps["style"]}
      />
    );
  }

  const NativeImage = AnimatedExpoImage as any;

  return (
    <NativeImage
      ref={ref}
      contentFit={imageContentFit}
      contentPosition={imageContentPosition}
      {...(props as ExpoImageProps)}
      source={normalizedSource as ExpoImageProps["source"]}
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
