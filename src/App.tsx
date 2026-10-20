import { useDrillController } from "./controller/useDrillController";
import { AppShell } from "./view/AppShell";

export function App() {
  const drill = useDrillController();
  return <AppShell drill={drill} />;
}
