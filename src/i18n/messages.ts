import en from "./messages/en.json";
import uz from "./messages/uz.json";
import ru from "./messages/ru.json";

export type Messages = typeof en;

export const dictionaries: Record<string, Messages> = {
  en,
  uz,
  ru,
};
