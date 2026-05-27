#!/bin/bash
# Create 1024x1024 placeholder icon with simple indigo background
convert -size 1024x1024 xc:'#6366f1' -gravity center -pointsize 200 -fill white -annotate +0+0 'HH' icon.png

# Create 1024x1024 splash icon (same as icon)
convert -size 1024x1024 xc:'#6366f1' -gravity center -pointsize 200 -fill white -annotate +0+0 'HH' splash-icon.png

# Create adaptive icon (1024x1024)
convert -size 1024x1024 xc:'#6366f1' -gravity center -pointsize 200 -fill white -annotate +0+0 'HH' adaptive-icon.png

# Create 48x48 favicon
convert -size 48x48 xc:'#6366f1' -gravity center -pointsize 24 -fill white -annotate +0+0 'HH' favicon.png

# Create 96x96 notification icon
convert -size 96x96 xc:'#6366f1' -gravity center -pointsize 48 -fill white -annotate +0+0 'HH' notification-icon.png

echo "✓ All placeholder assets created"
