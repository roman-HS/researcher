import { useCallback, useState } from "react";

export function useServerSyncedList<T>(
  serverItems: T[],
  getItemKey: (item: T) => string,
) {
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(() => new Set());
  const [prevServerItems, setPrevServerItems] = useState(serverItems);

  if (serverItems !== prevServerItems) {
    setPrevServerItems(serverItems);
    setRemovedKeys(new Set());
  }

  const items = serverItems.filter(
    (item) => !removedKeys.has(getItemKey(item)),
  );

  const removeItem = useCallback((key: string) => {
    setRemovedKeys((current) => new Set(current).add(key));
  }, []);

  return { items, removeItem };
}
