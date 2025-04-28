import { ROLES } from "../utils";

export default function RolesSelector({ selected, onSelected }) {
    return (
        <div className="flex flex-wrap text-sm gap-2 mt-2">
            {Object.keys(ROLES).map((role, idx) => (
                <label key={idx}>
                    <input
                        type="radio"
                        className="mr-1"
                        name="roles"
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
