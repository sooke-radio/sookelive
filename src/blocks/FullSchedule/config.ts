import { Block } from 'payload/types'
import { FullScheduleBlock } from '@/schedule/FullSchedule/Component'

export const FullScheduleBlock: Block = {
  slug: 'fullSchedule',
  labels: {
    singular: 'Full Schedule',
    plural: 'Full Schedules',
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
  ],
}
