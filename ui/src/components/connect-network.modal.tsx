import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

export default function ConnectNetworkModal({targetNetwork = '', onHide = () => {}, addNetwork = () => {}}) {
    return (
        <Modal show={true} onHide={onHide} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title>Wrong network...</Modal.Title>
        </Modal.Header>
        <Modal.Body className="border-0">
            <div>You are currently not connected to the {targetNetwork} Network. Please change your network to {targetNetwork} on MetaMask.</div>
        </Modal.Body>
        <Modal.Footer className="border-0">
        <Button variant="primary" onClick={addNetwork} className="bg-white text-primary font-weight-bold font-size-12px">
                <span className="mx-2">CHANGE NETWORK</span>
            </Button>
        </Modal.Footer>
      </Modal>
    );
}