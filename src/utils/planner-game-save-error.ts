export class GameSaveError extends Error {
  constructor(
    public code: string,
    public detail = ""
  ) {
    super(code);
  }
}

export class MissingCraftSuffixError extends GameSaveError {
  constructor(itemName: string) {
    super("property", itemName + ": of the Apprentice");
  }
}
