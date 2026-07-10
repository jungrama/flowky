import { useState, type ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import TaskList from "./TaskList";

interface TaskDrawerProps {
  children: ReactNode;
  /** Called with the chosen task title; the drawer closes after picking. */
  onPick?: (title: string) => void;
}

/** Bottom sheet listing tasks — create inline and pick one for a session. */
export default function TaskDrawer({ children, onPick }: TaskDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm px-4 pb-6">
          <DrawerHeader className="px-0">
            <DrawerTitle>Tasks</DrawerTitle>
            <DrawerDescription>
              {onPick
                ? "Pick what you're focusing on, or add a new one."
                : "Everything on your plate."}
            </DrawerDescription>
          </DrawerHeader>
          <TaskList
            onPick={
              onPick
                ? (title) => {
                    onPick(title);
                    setOpen(false);
                  }
                : undefined
            }
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
