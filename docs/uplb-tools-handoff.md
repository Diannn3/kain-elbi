# UPLB Tools Route Context Protocol v1

Kain Elbi accepts a privacy-preserving route context from another UPLB Tools app through URL parameters. The protocol carries only the minimum context needed to calculate food feasibility; it does not carry a student name, student number, course code, full schedule, or precise GPS coordinates.

## Endpoint

```text
/picks?src=room-tba&v=1&origin=<building>&destination=<building>&break=<minutes>
```

## Parameters

| Parameter | Required | Meaning |
| --- | --- | --- |
| `src` | no | Set to `room-tba` for Room TBA handoffs. |
| `v` | no | Protocol version. Current version is `1`. |
| `origin` | yes | Kain anchor ID, legacy building name, or slugified building name. |
| `destination` | no | Next building using the same identifier rules. Omit for one-way discovery. |
| `break` | yes | Available minutes, clamped by Kain to 20–180 minutes. |
| `category` | no | Soft food preference such as `cafe` or `fast_food`. |

Kain resolves both its legacy anchor names and slugified building names, so Room TBA can use the same slug convention it uses for building routes without exposing internal database row IDs.

## Example

```text
/picks?src=room-tba&v=1&origin=math-building&destination=physical-sciences-building&break=55
```

## Privacy contract

Do not add personally identifying or schedule-wide parameters to this protocol. In particular, never transmit:

- student name or number
- course/section identifiers unless a future feature genuinely needs them
- full weekly schedule
- raw latitude/longitude from the student's device

The receiving app may preserve `src` and `v` when linking between Smart Picks and the Kain map, but it should otherwise treat the handoff exactly like a route entered manually in Kain.
