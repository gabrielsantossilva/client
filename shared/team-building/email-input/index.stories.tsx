import * as React from 'react'
import * as Sb from '../../stories/storybook'
import EmailInput from '.'

const namespace = 'chat2'

const store = Sb.createStoreWithCommon()

const load = () => {
  Sb.storiesOf('Team-Building', module)
    .addDecorator((story: any) => <Sb.MockStore store={store}>{story()}</Sb.MockStore>)
    .add('Email address', () => (
      <EmailInput
        continueLabel="Continue"
        search={Sb.action('search')}
        namespace={namespace}
        teamBuildingSearchResults={{
          // @ts-ignore
          ['max@keybase.io']: {
            keybase: [
              {
                id: '[max@keybase.io]@email',
                label: '',
                prettyName: 'max@keybase.io',
                serviceId: 'email',
                serviceMap: {keybase: 'max'},
                username: 'max@keybase.io',
              },
            ],
          },
        }}
      />
    ))
}

export default load
