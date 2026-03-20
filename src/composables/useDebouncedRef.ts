import { ref, watch, type Ref } from "vue";

/**
 * Returns a ref that updates with a delay after the source ref changes.
 * @param source - Reactive ref to debounce
 * @param delayMs - Delay in milliseconds (default 250)
 */
export function useDebouncedRef<T>(source: Ref<T>, delayMs = 250): Ref<T> {
  const debounced = ref(source.value) as Ref<T>;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  watch(
    source,
    (value) => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      // Update immediately when cleared for snappy UX
      if (value === "" || value === null || value === undefined) {
        debounced.value = value;
        return;
      }
      timeoutId = setTimeout(() => {
        debounced.value = value;
        timeoutId = null;
      }, delayMs);
    },
    { immediate: false }
  );

  return debounced;
}
