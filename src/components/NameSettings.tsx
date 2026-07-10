import { useState } from "react";
import { getUserName, setUserName } from "../lib/preferences";

export default function NameSettings() {
  const [name, setName] = useState(getUserName);

  return (
    <div className="name-settings">
      <p className="form-label">Your name</p>
      <p className="screen-subtitle name-settings-copy">
        We&apos;ll greet you by name back on Home. Stays on this machine.
      </p>
      <input
        type="text"
        className="name-settings-input"
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
