// Maps values to a queue or an array of items.
export default class MapToArray<T, S> {
  private data: Map<T, S[]>;

  constructor() {
    this.data = new Map<T, S[]>();
  }

  public push(key: T, value: S, limit: number = -1) {
    if (!this.data.has(key)) {
      this.data.set(key, [value]);
    } else {
      const queue = this.data.get(key);

      if (limit > 0 && queue.length >= limit) {
        return;
      }
      queue.push(value);
    }
  }

  // Throws if value or key not present
  public remove(key: T, value: S) {
    if (!this.data.has(key)) {
      throw Error(`Key "${key}" is not present on Map.`);
    }

    const array = this.data.get(key);
    const idx = array.indexOf(value);

    if (idx < 0) {
      throw Error(`Value "${value}" not present on Map at ${key}.`);
    }

    array.splice(idx, 1);
  }

  // Throws if key not present
  public removeKey(key: T) {
    if (!this.data.has(key)) {
      throw Error(`Key "${key}" is not present on Map.`);
    }

    this.data.delete(key);
  }

  // Throws if T is not present.
  public get(key: T): S[] {
    if (!this.data.has(key)) {
      throw Error(`Key "${key}" is not present on Map.`);
    }

    return this.data.get(key);
  }

  // Throws if T is not present.
  // Deletes frontmost element like a queue.
  public pop(key: T): S {
    if (!this.data.has(key)) {
      throw Error(`Key "${key}" is not present on Map.`);
    }

    return this.data.get(key).pop();
  }

  // Throws if T is not present.
  // Deletes frontmost element like a queue.
  public shift(key: T): S {
    if (!this.data.has(key)) {
      throw Error(`Key "${key}" is not present on Map.`);
    }

    return this.data.get(key).shift();
  }

  public forEach(iterator: (queue: S[]) => any) {
    return this.data.forEach(iterator);
  }

  public has(key: T): boolean {
    return this.data.has(key);
  }

  public get length(): number {
    return this.data.size;
  }
}
