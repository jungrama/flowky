import { useState } from "react";
import { Input } from "@/components/ui/input";
import { getUserName, setUserName } from "../lib/preferences";

export default function NameSettings() {
  const [name, setName] = useState(getUserName);

  return (
    <div className="mb-6 w-full">
      <p className="mb-2 mt-1 text-sm text-muted-foreground">
        We&apos;ll greet you by name back on Home. Stays on this machine.
      </p>
      <Input
        id="name-input"
        type="text"
        placeholder="e.g. Rama"
        value={name}
        maxLength={40}
        onChange={(e) => {
          setName(e.target.value);
          setUserName(e.target.value);
        }}
        aria-label="Your name"
      />
    </div>
  );
}
