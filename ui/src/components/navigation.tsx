import { Container, Navbar } from 'react-bootstrap';

export default function Nav() {
    return (
        <Navbar bg="light" expand="lg">
            <Navbar.Brand href="/" className="px-2">
                <img src="/bludac-logo.png" width="40" className="mx-3" alt="" />
                <span className="text-primary font-weight-bold">BluDAC Bridge</span>
            </Navbar.Brand>
        </Navbar>
    );
}