/* eslint-env jest */
import * as I from 'immutable'
import * as TeamBuildingGen from '../team-building-gen'
import * as RPCTypes from '../../constants/types/rpc-gen'
import {chatTeamBuildingSaga} from '../chat2'
import * as Testing from '../../util/testing'
import * as Types from '../../constants/types/team-building'

const testNamespace = 'chat2'

jest.mock('../../engine/require')

// We want to be logged in usually
const blankStore = Testing.getInitialStore()
const initialStore = {
  ...blankStore,
  config: {...blankStore.config, deviceID: '999', loggedIn: true, username: 'username'},
}

const startReduxSaga = Testing.makeStartReduxSaga(chatTeamBuildingSaga, initialStore, () => {})

const mockResults: Array<RPCTypes.APIUserSearchResult> = [
  {
    keybase: {
      fullName: 'Marco Munizaga',
      isFollowee: false,
      pictureUrl:
        'https://s3.amazonaws.com/keybase_processed_uploads/67a551a80db42fc190462c28e5785a05_200_200_square_200.jpeg',
      rawScore: 3.0076923076923077,
      stellar: null,
      uid: '4c230ae8d2f922dc2ccc1d2f94890700',
      username: 'marcopolo',
    },
    rawScore: 3.0076923076923077,
    score: 0.5,
    service: {
      bio: '',
      fullName: '',
      location: '',
      pictureUrl: '',
      serviceName: 'github',
      username: 'marcopolo',
    },
    servicesSummary: {
      facebook: {serviceName: 'facebook', username: 'mmunizaga1337'},
      github: {serviceName: 'github', username: 'marcopolo'},
      twitter: {serviceName: 'twitter', username: 'open_sourcery'},
    },
  },
  {
    keybase: {
      fullName: null,
      isFollowee: false,
      pictureUrl:
        'https://s3.amazonaws.com/keybase_processed_uploads/f5bf95bd2d0388e8d0171de9caab6405_200_200.jpeg',
      rawScore: 0.005263157894736842,
      stellar: null,
      uid: '7da8ce717861fe1d98bbbbe617a49719',
      username: 'rustybot',
    },
    rawScore: 0.005263157894736842,
    score: 0.3333333333333333,
    servicesSummary: {},
  },
]

// Maps the user search function to a hashmap, query -> num_wanted -> service -> include_services_summary
const userSearchMock = {
  marcopolo: {
    '11': {
      github: {
        true: mockResults.slice(0, 1),
      },
      keybase: {
        true: mockResults,
      },
    },
  },
}

const mockUserSearchRpcPromiseRpcPromise = (
  params: RPCTypes.MessageTypes['keybase.1.userSearch.userSearch']['inParam']
) => {
  const {query, maxResults, service, includeServicesSummary} = params
  let result
  try {
    result = userSearchMock[query][maxResults][service][String(includeServicesSummary)]
  } catch (e) {
    throw new Error(
      `userSearchMock not implemented for query: ${query}, num_wanted: ${maxResults}, service: ${service} and ${includeServicesSummary}. Try adding those fields to the userSearchMock hashmap.`
    )
  }
  if (result) {
    return Promise.resolve(result)
  } else {
    return Promise.reject(new Error('No mock result found'))
  }
}

const expectedGithub: Array<Types.User> = [
  {
    id: 'marcopolo@github+marcopolo',
    prettyName: 'Marco Munizaga',
    serviceId: 'github',
    serviceMap: {
      facebook: 'mmunizaga1337',
      github: 'marcopolo',
      keybase: 'marcopolo',
      twitter: 'open_sourcery',
    },
    username: 'marcopolo',
  },
]

const expectedKeybase: Array<Types.User> = [
  {
    id: 'marcopolo',
    prettyName: 'Marco Munizaga',
    serviceId: 'keybase',
    serviceMap: {
      facebook: 'mmunizaga1337',
      github: 'marcopolo',
      keybase: 'marcopolo',
      twitter: 'open_sourcery',
    },
    username: 'marcopolo',
  },
  {
    id: 'rustybot',
    prettyName: 'rustybot',
    serviceId: 'keybase',
    serviceMap: {
      keybase: 'rustybot',
    },
    username: 'rustybot',
  },
]

const parsedSearchResults = {
  marcopolo: {
    github: I.Map().mergeIn(['marcopolo'], {
      github: expectedGithub,
    }),
    keybase: I.Map().mergeIn(['marcopolo'], {
      keybase: expectedKeybase,
    }),
  },
}

describe('Search Actions', () => {
  let init: ReturnType<typeof startReduxSaga>
  let rpc
  beforeEach(() => {
    init = startReduxSaga()
    rpc = jest.spyOn(RPCTypes, 'userSearchUserSearchRpcPromise')
    rpc.mockImplementation(mockUserSearchRpcPromiseRpcPromise)
  })
  afterEach(() => {
    rpc && rpc.mockRestore()
  })

  it('Calls search', () => {
    const {dispatch} = init
    expect(rpc).not.toHaveBeenCalled()
    dispatch(
      TeamBuildingGen.createSearch({
        includeContacts: false,
        namespace: testNamespace,
        query: 'marcopolo',
        service: 'keybase',
      })
    )
    expect(rpc).toHaveBeenCalled()
  })

  it('Parses the search results', () => {
    const {dispatch, getState} = init
    const query = 'marcopolo'
    const service = 'keybase'
    expect(rpc).not.toHaveBeenCalled()
    dispatch(
      TeamBuildingGen.createSearch({
        includeContacts: false,
        namespace: testNamespace,
        query,
        service,
      })
    )
    expect(getState().chat2.teamBuilding.teamBuildingSearchQuery).toEqual('marcopolo')
    expect(getState().chat2.teamBuilding.teamBuildingSelectedService).toEqual('keybase')
    return Testing.flushPromises().then(() => {
      expect(getState().chat2.teamBuilding.teamBuildingSearchResults).toEqual(
        parsedSearchResults[query][service]
      )
    })
  })

  it('Parses the search result for service', () => {
    const {dispatch, getState} = init
    const query = 'marcopolo'
    const service = 'github'
    expect(rpc).not.toHaveBeenCalled()
    dispatch(
      TeamBuildingGen.createSearch({
        includeContacts: false,
        namespace: testNamespace,
        query,
        service,
      })
    )
    expect(getState().chat2.teamBuilding.teamBuildingSearchQuery).toEqual('marcopolo')
    expect(getState().chat2.teamBuilding.teamBuildingSelectedService).toEqual('github')
    return Testing.flushPromises().then(() => {
      expect(getState().chat2.teamBuilding.teamBuildingSearchResults).toEqual(
        parsedSearchResults[query][service]
      )
    })
  })

  it('Adds users to the team so far', () => {
    const {dispatch, getState} = init
    const userToAdd = parsedSearchResults['marcopolo']['keybase'].getIn(['marcopolo', 'keybase'], [])[0]
    dispatch(TeamBuildingGen.createAddUsersToTeamSoFar({namespace: testNamespace, users: [userToAdd]}))
    return Testing.flushPromises().then(() => {
      expect(getState().chat2.teamBuilding.teamBuildingTeamSoFar).toEqual(I.OrderedSet([userToAdd]))
    })
  })

  it('Remove users to the team so far', () => {
    const {dispatch, getState} = init
    const userToAdd = parsedSearchResults['marcopolo']['keybase'].getIn(['marcopolo', 'keybase'], [])[0]
    dispatch(TeamBuildingGen.createAddUsersToTeamSoFar({namespace: testNamespace, users: [userToAdd]}))
    dispatch(TeamBuildingGen.createRemoveUsersFromTeamSoFar({namespace: testNamespace, users: ['marcopolo']}))
    return Testing.flushPromises().then(() => {
      expect(getState().chat2.teamBuilding.teamBuildingTeamSoFar).toEqual(I.OrderedSet())
    })
  })

  it('Moves finished team over and clears the teamSoFar on finished', () => {
    const {dispatch, getState} = init
    const userToAdd = parsedSearchResults['marcopolo']['keybase'].getIn(['marcopolo', 'keybase'], [])[0]
    dispatch(TeamBuildingGen.createAddUsersToTeamSoFar({namespace: testNamespace, users: [userToAdd]}))
    dispatch(TeamBuildingGen.createFinishedTeamBuilding({namespace: testNamespace}))
    return Testing.flushPromises().then(() => {
      expect(getState().chat2.teamBuilding.teamBuildingTeamSoFar).toEqual(I.OrderedSet())
      expect(getState().chat2.teamBuilding.teamBuildingFinishedTeam).toEqual(I.OrderedSet([userToAdd]))
    })
  })

  it('Cancel team building clears the state', () => {
    const {dispatch, getState} = init
    const userToAdd = parsedSearchResults['marcopolo']['keybase'].getIn(['marcopolo', 'keybase'], [])[0]
    dispatch(TeamBuildingGen.createAddUsersToTeamSoFar({namespace: testNamespace, users: [userToAdd]}))
    dispatch(TeamBuildingGen.createCancelTeamBuilding({namespace: testNamespace}))
    return Testing.flushPromises().then(() => {
      expect(getState().chat2.teamBuilding.teamBuildingTeamSoFar).toEqual(I.OrderedSet())
      expect(getState().chat2.teamBuilding.teamBuildingFinishedTeam).toEqual(I.OrderedSet())
    })
  })
})
