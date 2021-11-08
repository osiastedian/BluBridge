import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

export default function ConnectMetamaskModal({ onHide = () => {} }) {
  return (
    <Modal show={true} onHide={onHide} centered>
      <Modal.Header closeButton className='border-0'>
        <Modal.Title>Metamask missing...</Modal.Title>
      </Modal.Header>
      <Modal.Body className='border-0'>
        Metamask needs to be installed in your browser so that you can connect
        to your wallet.
      </Modal.Body>
      <Modal.Footer className='border-0'>
        <a href='https://metamask.io/download' target='_blank' rel='noreferrer'>
          <Button
            variant='primary'
            className='bg-white text-primary font-weight-bold font-size-12px'
          >
            <img src='/metamask.png' width='20' alt='' />
            <span className='mx-2'>DOWNLOAD METAMASK</span>
          </Button>
        </a>
      </Modal.Footer>
    </Modal>
  );
}
