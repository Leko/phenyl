/* global phenylApiExplorerClientGlobals */
import React, { Component } from 'react'
import { connect } from 'react-redux'
import { Message, Form, Button, Header, Icon, Modal } from 'semantic-ui-react'
import { login, loginAsAnonymous } from '../modules/user'
import type { Credential } from 'phenyl-interfaces'

type Props = {
  entityNames: Array<string>,
  busy: boolean,
  error: ?Error,
  open: boolean,
  login: (string, Credential) => void,
  loginAsAnonymous: () => void
}

type State = {

}

const { PhenylFunctionalGroupSkeleton } = phenylApiExplorerClientGlobals

class LoginModal extends Component<Props, State> {
  state = {
    entityName: '',
    accountPropName: '',
    accountPropValue: '',
    passwordPropName: '',
    passwordPropValue: '',
  }

  handleChangeEntity = (event, { value }) => {
    if (!PhenylFunctionalGroupSkeleton.users[value]) {
      throw new Error(`Entity '${value}' is not defined`)
    }
    const { accountPropName, passwordPropName } = PhenylFunctionalGroupSkeleton.users[value]

    this.setState({
      entityName: value,
      accountPropName,
      passwordPropName
    })
  }

  handleChangeField = (field) => (event, { value }) => {
    this.setState({ [field]: value })
  }

  handleLogin = () => {
    const credential = {
      [this.state.accountPropName]: this.state.accountPropValue,
      [this.state.passwordPropName]: this.state.passwordPropValue,
    }
    this.props.login(this.state.entityName, credential)
  }

  componentWillMount () {
    this.handleChangeEntity(null, { value: this.props.entityNames[0] })
  }

  render () {
    const { error, busy, entityNames, open, loginAsAnonymous } = this.props

    return (
      <Modal open={open} basic size='small'>
        <Header icon='user circle outline' content='Login to Phenyl API Explorer' />
        <Modal.Content>
          <p>Please enter credential.</p>
          <Form inverted error={!!error}>
            <Form.Field>
              <Form.Select
                label='User entity'
                options={entityNames.map(entityName => ({
                  key: entityName,
                  text: entityName,
                  value: entityName,
                }))}
                defaultValue={entityNames[0]}
                onChange={this.handleChangeEntity}
              />
            </Form.Field>
            <Form.Field>
              <Form.Input
                label={this.state.accountPropName}
                inverted
                onChange={this.handleChangeField('accountPropValue')}
              />
            </Form.Field>
            <Form.Field>
              <Form.Input
                label={this.state.passwordPropName}
                type='password'
                inverted
                onChange={this.handleChangeField('passwordPropValue')}
              />
            </Form.Field>
            {error && (
              <Message
                error
                header={`Login failure: ${error.message}`}
                content={ + error.stack}
              />
            )}
          </Form>
        </Modal.Content>
        <Modal.Actions>
          <Button basic color='red' inverted onClick={loginAsAnonymous} disabled={busy}>
            Login as anonymous
          </Button>
          <Button color='green' inverted onClick={this.handleLogin} disabled={busy}>
            <Icon name='checkmark' /> Login
          </Button>
        </Modal.Actions>
      </Modal>
    )
  }
}

const mapStateToProps = (state) => ({
  entityNames: Object.keys(PhenylFunctionalGroupSkeleton.users),
  error: state.user.error,
  busy: state.user.busy,
})

const mapDispatchToProps = (dispatch) => ({
  login (entityName, credential) {
    dispatch(login(entityName, credential))
  },
  loginAsAnonymous () {
    dispatch(loginAsAnonymous())
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(LoginModal)
