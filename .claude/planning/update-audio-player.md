# update the audio player

Updates to be made to the audio player UI and functionality:

- allow users to select from multiple streams of different qualities
  - 'high' (opus), 'low' (opus), 'low-mp3' (required for older iOS devices)
- allow users to copy the direct stream URL to paste into other apps or access directly
- ability to link back to the show page of the currently playing or scheduled show
  - this may need to be time-based to correctly link live shows.
  - option: override the show-title with the scheduled show title if any 'live' user is connected during the timeslot: often the show titles are not updated correctly by DJs in Azuracast
- include 'chat' link in the player that links to discord?
- UI requirement: maintain simplicity as much as possible, and do not add undue clutter to the existing design.
