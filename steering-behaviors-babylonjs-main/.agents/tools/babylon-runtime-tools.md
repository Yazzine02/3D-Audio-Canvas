# Babylon Runtime Tools Guide

## Purpose
Define safe and repeatable command usage for this workspace runtime and JS edits

## Preferred Commands
- Search text: `rg "pattern" js`
- List files: `rg --files`
- Syntax check single file: `node -c js/FileName.js`
- Syntax check edited set: `node -c js/BabylonApp.js js/BabylonGUI.js js/EyeTracking.js js/SteeringVehicle.js`

## Edit Safety Rules
- Prefer minimal diffs
- Do not rewrite unrelated sections
- Keep file name casing exact in `index.html` script tags
- Keep asset paths explicit for loader calls

## Runtime Verification
- Check script path errors in browser console
- Check model load path under `assets/`
- Check globals expected by cross module calls

## Non Destructive Policy
- Never use destructive git reset commands
- Never remove files not requested by task
- Preserve user changes in unrelated files
