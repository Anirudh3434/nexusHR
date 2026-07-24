#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
mkdir -p hrm-desktop
cd hrm-desktop
npm init -y
npm install react@18.2.0 react-native@0.73.4 react-native-macos@0.73.4
npx react-native-macos-init
