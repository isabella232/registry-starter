/** @jsx jsx */
import PropTypes from 'prop-types'
import { jsx, Box } from 'theme-ui'
import Field from '../Field'
import Button from '../Button'
import UploadImage from '../UploadImage'

const TokenForm = ({ token, setValue, isDisabled, handleSubmit }) => (
  <form onSubmit={handleSubmit}>
    <Field
      type="input"
      title="Token symbol"
      placeholder="Text"
      charsCount={10}
      value={token.symbol}
      setValue={value => setValue('symbol', value)}
    />
    <Field
      type="textarea"
      title="Description"
      placeholder="Describe the token"
      charsCount={300}
      value={token.description}
      setValue={value => setValue('description', value)}
    />
    <Field
      type="input"
      title="Contract address"
      placeholder="Enter Address"
      charsCount={42}
      value={token.address}
      setValue={value => setValue('address', value)}
    />
    <Box sx={{ my: 6 }}>
      <p sx={{ variant: 'text.small', color: 'secondary', mb: 2 }}>
        Token logo (optional)
      </p>
      <UploadImage setImage={setValue} />
    </Box>
    <Field
      type="input"
      title="Decimals"
      placeholder="Enter amount"
      charsCount={10}
      value={token.decimals}
      setValue={value => setValue('decimals', value)}
    />
    <Button
      text="Save changes"
      variant="primary"
      isDisabled={isDisabled}
      onClick={handleSubmit}
    />
  </form>
)

TokenForm.propTypes = {
  token: PropTypes.any,
  setValue: PropTypes.func,
  handleSubmit: PropTypes.func,
  isDisabled: PropTypes.bool,
}

export default TokenForm