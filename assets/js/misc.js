import _ from 'lodash-es'
import copyToClipboard from 'copy-to-clipboard'

export function loadScript(url, callback) {
  const script = document.createElement('script')
        script.type = 'text/javascript'

  if (script.readyState) {
    script.onreadystatechange = () => {
      if (
        script.readyState === 'loaded'
        || script.readyState === 'complete'
      ) {
        script.onreadystatechange = null
        callback()
      }
    }
  } else
    script.onload = () => callback()

  script.src = url
  document.getElementsByTagName('head')[0].appendChild(script)
}

export function copy() {
  this.copied = true

  copyToClipboard(
    _.get(this, 'transaction.transaction')
  )
}