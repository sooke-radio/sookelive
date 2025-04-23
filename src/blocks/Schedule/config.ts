import { Block } from 'payload'

export const ScheduleBlock: Block = {
  slug: 'schedule',
  interfaceName: 'ScheduleBlock',
  labels: {
    singular: 'Schedule',
    plural: 'Schedules',
  },
  fields: [
    {
      name: 'showsHeading',
      type: 'text',
      label: 'Schedule Heading',
      defaultValue: 'Weekly Schedule',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
    },
    {
      name: 'allShows',
      type: 'checkbox',
      label: 'Show All Shows',
    },
    {
      name: 'shows',
      type: 'relationship',
      relationTo: 'shows',
      defaultValue: [],
      hasMany: true,
    }
  ],
}
