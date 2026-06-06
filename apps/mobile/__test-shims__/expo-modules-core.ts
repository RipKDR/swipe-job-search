export class EventEmitter {
  addListener() { return { remove: () => {} }; }
  removeAllListeners() {}
  emit() {}
}
export const NativeModulesProxy = {};
export const requireNativeModule = (): Record<string, unknown> => ({});
export const requireOptionalNativeModule = (): null => null;
export const requireNativeViewManager = (): { displayName: string } => ({ displayName: 'NativeView' });
export class SharedObject {}
export class NativeModule {}
export const registerWebModule = <T>(mod: T): T => mod;
