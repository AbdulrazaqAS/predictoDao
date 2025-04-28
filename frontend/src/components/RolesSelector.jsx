import { useId } from "react";
import { ROLES } from "../utils";

export default function RolesSelector({ selected, onSelected }) {
    const internalId = useId();
    const radioGroup = `roles-${internalId}`;

    return (
        <div className="flex flex-wrap text-sm gap-2 mt-2">
            {Object.keys(ROLES).map((role, idx) => (
                <label key={idx}>
                    <input
                        type="radio"
                        className="mr-1"
                        name={radioGroup}
                        value={ROLES[role].toString()}
                        checked={selected === ROLES[role].toString()}
                        onChange={e => {
                            onSelected(e.target.value);
                        }}
                    />
                    {role}
                </label>
            ))}
        </div>
    )
}
