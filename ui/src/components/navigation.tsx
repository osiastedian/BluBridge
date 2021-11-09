import { Container, Image, Navbar } from 'react-bootstrap';

const Nav = () => {
  return (
    <Navbar bg='light' expand='lg'>
      <Navbar.Brand href='/' className='px-2'>
        <Image src='/bludac-logo.png' width='40' className='mx-3' alt='' />
        <span className='text-primary font-weight-bold'>BluDAC Bridge</span>
      </Navbar.Brand>
    </Navbar>
  );
};

export default Nav;
